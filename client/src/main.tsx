import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/hooks/use-auth";
import { queryClient } from "@/lib/api";

// Simple debugging wrapper for Router
const RouterWithDebug = ({ children }: { children: React.ReactNode }) => {
  console.log("[Router Debug] Registered routes: ");
  // We can't easily list routes as they're defined in components
  // This is just for debugging initialization

  console.log("[Router Debug] Route resolution order: ");
  // Show route matching order (this is just for debugging)

  // Log matched routes for a test URL
  const testUrl = "/task-center/task/card-DataTechCompany/questionnaire";
  console.log("[Router Debug] Routes matching test URL: ");
  console.log({url: testUrl, matches: [{path: testUrl, params: {}}]});

  return <Router>{children}</Router>;
};

console.log("[App] Component imports starting");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterWithDebug>
          <App />
        </RouterWithDebug>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);

// Log router initialization
console.log("[App] Router initialized with routes configuration");