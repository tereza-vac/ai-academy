import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function Component() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you were looking for doesn't exist."
      action={
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </Button>
      }
    />
  );
}

export default Component;
