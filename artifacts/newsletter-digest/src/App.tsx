import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError, getGetSessionQueryKey, useGetSession } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PressLayout } from "@/components/press/press-layout";
import Today from "@/pages/today";
import StoryPage from "@/pages/story";
import DigestView from "@/pages/digest";
import Archive from "@/pages/archive";
import Senders from "@/pages/senders";
import Search from "@/pages/search";
import NotFound from "@/pages/not-found";
import SignIn from "@/pages/sign-in";
import Privacy from "@/pages/privacy";

const signedOut = (err: unknown) => err instanceof ApiError && err.status === 401;

const queryClient: QueryClient = new QueryClient({
  // A 401 anywhere means the session ended: re-check it, which shows the sign-in screen.
  queryCache: new QueryCache({
    onError: (err, query) => {
      const isSessionCheck = query.queryKey[0] === getGetSessionQueryKey()[0];
      if (signedOut(err) && !isSessionCheck) queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
    },
  }),
  defaultOptions: { queries: { retry: (count, err) => !signedOut(err) && count < 2 } },
});

/** Everything except the sign-in screen needs a Google sign-in. */
function SessionGate({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = useGetSession({ query: { queryKey: getGetSessionQueryKey(), staleTime: 60_000 } });
  if (isLoading) return <div className="h-dvh bg-paper" />;
  return session ? <>{children}</> : <SignIn />;
}

/** Edition screens lay themselves out; older screens get the padded column. */
const EDITION_ROUTES = [/^\/$/, /^\/story\//];

function Router() {
  const [location] = useLocation();
  return (
    <PressLayout padded={!EDITION_ROUTES.some((r) => r.test(location))}>
      <Switch>
        <Route path="/" component={Today} />
        <Route path="/story/:digestId/:storyId" component={StoryPage} />
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
          <Switch>
            <Route path="/privacy" component={Privacy} />
            <Route>
              <SessionGate>
                <Router />
              </SessionGate>
            </Route>
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
