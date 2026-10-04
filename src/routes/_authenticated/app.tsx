import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getMyAccess } from "@/lib/account.functions";
import { AccountHold } from "@/components/gent/AccountHold";
import { OnboardingSheet } from "@/components/gent/OnboardingSheet";

// RequireAuth for /app/*: parent _authenticated gate ensures a session; here we check status server-side.
export const Route = createFileRoute("/_authenticated/app")({
  loader: () => getMyAccess(),
  component: AppLayout,
});

function AppLayout() {
  const access = Route.useLoaderData();
  if (access.status !== "active") return <AccountHold />;
  return (
    <>
      <Outlet />
      {access.needsOnboarding && <OnboardingSheet />}
    </>
  );
}
