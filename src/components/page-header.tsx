import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="grid grid-cols-3 items-center">
      <Button variant="outline" className="justify-self-start" nativeButton={false} render={<Link to="/agent" />}>
        <ArrowLeftIcon />
        Back
      </Button>
      <h1 className="text-center text-lg font-semibold">{title}</h1>
      <div className="justify-self-end">{action}</div>
    </header>
  );
}
