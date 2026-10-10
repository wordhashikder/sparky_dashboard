import { Centered } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <Centered>
      <div className="text-center">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm">
          The page you're looking for doesn't exist.
        </p>
        <ButtonLink to="/" className="mt-6">
          Go to your dashboard
        </ButtonLink>
      </div>
    </Centered>
  );
}
