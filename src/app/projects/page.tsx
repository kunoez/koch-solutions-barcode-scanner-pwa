"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ChevronRight, LogOut, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { saveProjects, saveOfflineData } from "@/lib/db";
import { useAppStore } from "@/store";
import { Project } from "@/types";
import { toast } from "sonner";

export default function ProjectsPage() {
  const router = useRouter();
  const { token, setSelectedProject, logout } = useAppStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }

    loadProjects();
  }, [token, router]);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      await saveProjects(data);
    } catch (error) {
      toast.error("Failed to load projects");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = async (project: Project) => {
    setSelectedProject(project);
    setIsSyncing(true);

    try {
      // Sync offline data for the project
      const offlineData = await api.getOfflineData();
      await saveOfflineData(offlineData);
      toast.success("Data synced successfully");
      router.push("/scan");
    } catch (error) {
      toast.error("Failed to sync data");
      console.error(error);
      // Still navigate even if sync fails
      router.push("/scan");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Select Project</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
            </Card>
          ))
        ) : projects.length === 0 ? (
          // Empty state
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects available</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={loadProjects}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Project list
          projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-colors hover:bg-accent active:bg-accent/80"
              onClick={() => handleSelectProject(project)}
            >
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {project.company} • {project.code}
                  </CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
            </Card>
          ))
        )}
      </main>

      {/* Syncing overlay */}
      {isSyncing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-64">
            <CardContent className="flex flex-col items-center py-6">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Syncing data...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
