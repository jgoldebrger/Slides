import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This project or page doesn&apos;t exist, or you don&apos;t have access to
        it.
      </p>
      <Button asChild className="mt-6">
        <Link href="/projects">Back to projects</Link>
      </Button>
    </div>
  );
}
