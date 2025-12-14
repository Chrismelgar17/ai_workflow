"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Canvas } from "@/components/canvas";
import { Command } from 'lucide-react';

export default function WorkflowBuilder() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (!token) router.push("/login");
    }
  }, [router]);
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Header / Nav (Minimal) */}
      <div className="fixed top-0 left-0 w-full h-14 bg-background/80 backdrop-blur border-b border-border z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <Command className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight">FlowBuilder</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Templates
          </button>
          <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Settings
          </button>
          <button className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
            Publish
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex w-full h-full pt-14">
        <Sidebar />
        <main className="flex-1 relative">
          <Canvas />
        </main>
      </div>
    </div>
  );
}
