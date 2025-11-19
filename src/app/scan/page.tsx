"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Scanner } from "@/components/Scanner";
import { useAppStore } from "@/store";
import { useLocation } from "@/hooks/useLocation";
import { saveScan, getScanHistory, getPendingScans } from "@/lib/db";
import { api } from "@/lib/api";
import { Scan } from "@/types";
import { toast } from "sonner";
import {
  Camera,
  Keyboard,
  History,
  Menu,
  LogOut,
  RefreshCw,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";

export default function ScanPage() {
  const router = useRouter();
  const { token, selectedProject, logout, pendingScansCount, setPendingScansCount } = useAppStore();
  const { location, requestLocation } = useLocation();
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanHistory, setScanHistory] = useState<Scan[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("scan");

  useEffect(() => {
    if (!token || !selectedProject) {
      router.push("/");
      return;
    }
    loadScanHistory();
    loadPendingCount();
  }, [token, selectedProject, router]);

  const loadScanHistory = async () => {
    const history = await getScanHistory();
    setScanHistory(history);
  };

  const loadPendingCount = async () => {
    const pending = await getPendingScans();
    setPendingScansCount(pending.length);
  };

  const handleScan = async (barcode: string) => {
    if (!location) {
      requestLocation();
      toast.error("Location not available. Please allow location access.");
      return;
    }

    try {
      // Save scan locally
      await saveScan({
        barcode,
        lat: location.lat,
        lng: location.lng,
        comment: "",
        date: new Date().toISOString(),
        images: [],
      });

      toast.success(`Scanned: ${barcode}`);
      loadScanHistory();
      loadPendingCount();

      // Try to sync immediately
      syncScans();
    } catch (error) {
      toast.error("Failed to save scan");
      console.error(error);
    }
  };

  const handleManualSubmit = () => {
    if (!manualBarcode.trim()) {
      toast.error("Please enter a barcode");
      return;
    }
    handleScan(manualBarcode.trim());
    setManualBarcode("");
  };

  const syncScans = async () => {
    const pending = await getPendingScans();
    if (pending.length === 0) return;

    setIsSubmitting(true);
    let synced = 0;

    for (const scan of pending) {
      try {
        const formData = new FormData();
        formData.append("barcode", scan.barcode);
        formData.append("lat", scan.lat.toString());
        formData.append("lng", scan.lng.toString());
        formData.append("comment", scan.comment || "");
        formData.append("date", scan.date);

        await api.createScan(formData);
        synced++;
      } catch (error) {
        console.error("Failed to sync scan:", error);
      }
    }

    if (synced > 0) {
      toast.success(`Synced ${synced} scan(s)`);
    }

    loadPendingCount();
    setIsSubmitting(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    logout();
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex-none border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-top">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold truncate max-w-40">
              {selectedProject?.name || "Scanner"}
            </h1>
            {pendingScansCount > 0 && (
              <Badge variant="secondary" className="bg-orange-500/20 text-orange-400">
                {pendingScansCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={syncScans}
              disabled={isSubmitting || pendingScansCount === 0}
            >
              <RefreshCw className={`h-5 w-5 ${isSubmitting ? "animate-spin" : ""}`} />
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push("/projects")}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Change Project
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="flex-1 overflow-hidden">
          <TabsContent value="scan" className="h-full m-0 data-[state=active]:flex">
            <Scanner onScan={handleScan} continuous />
          </TabsContent>

          <TabsContent value="manual" className="h-full m-0 p-4">
            <Card>
              <CardHeader>
                <CardTitle>Manual Entry</CardTitle>
                <CardDescription>
                  Enter barcode manually if scanning fails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter barcode..."
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                />
                <Button onClick={handleManualSubmit} className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Submit
                </Button>
                {location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="h-full m-0 p-4 overflow-auto">
            <div className="space-y-3">
              {scanHistory.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center py-8">
                    <History className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No scans yet</p>
                  </CardContent>
                </Card>
              ) : (
                scanHistory.map((scan, index) => (
                  <Card key={scan.id || index}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-mono text-sm font-medium">
                            {scan.barcode}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(scan.date).toLocaleString()}
                          </p>
                        </div>
                        {scan.synced ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </div>

        {/* Bottom Navigation */}
        <TabsList className="flex-none h-16 rounded-none border-t bg-background safe-bottom">
          <TabsTrigger
            value="scan"
            className="flex-1 flex-col gap-1 h-full data-[state=active]:bg-primary/10"
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs">Scan</span>
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="flex-1 flex-col gap-1 h-full data-[state=active]:bg-primary/10"
          >
            <Keyboard className="h-5 w-5" />
            <span className="text-xs">Manual</span>
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex-1 flex-col gap-1 h-full data-[state=active]:bg-primary/10"
          >
            <History className="h-5 w-5" />
            <span className="text-xs">History</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
