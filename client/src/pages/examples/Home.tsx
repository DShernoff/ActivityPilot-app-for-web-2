import Home from "../Home";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function HomeExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
