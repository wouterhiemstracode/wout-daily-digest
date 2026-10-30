import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PressLayout } from "@/components/press/press-layout";
import Today from "@/pages/today";
import DigestView from "@/pages/digest";
import Archive from "@/pages/archive";
import Senders from "@/pages/senders";
import Search from "@/pages/search";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

/** Edition screens lay themselves out; older screens get the padded column. */
const EDITION_ROUTES = [/^\/$/, /^\/story\//];

function Router() {
  const [location] = useLocation();
  return (
    <PressLayout padded={!EDITION_ROUTES.some((r) => r.test(location))}>
      <Switch>
        <Route path="/" component={Today} />
        <Route path="/digest/:id" component={DigestView} />
        <Route path="/archive" component={Archive} />
        <Route path="/senders" component={Senders} />
        <Route path="/search" component={Search} />
        <Route component={NotFound} />
      </Switch>
    </PressLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
