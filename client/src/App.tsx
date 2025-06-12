import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Properties from "@/pages/properties";
import Applications from "@/pages/applications";
import Financials from "@/pages/financials";
import PoolFund from "@/pages/pool-fund";
import Reports from "@/pages/reports";
import Mobile from "@/pages/mobile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/mobile" component={Mobile} />
      <Route path="/" nest>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/clients" component={Clients} />
            <Route path="/properties" component={Properties} />
            <Route path="/applications" component={Applications} />
            <Route path="/financials" component={Financials} />
            <Route path="/pool-fund" component={PoolFund} />
            <Route path="/reports" component={Reports} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
