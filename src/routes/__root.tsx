import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import { WorkspaceProvider } from "@/components/table-context";

import appCss from "../styles.css?url";

const isSingleFile = import.meta.env.VITE_SINGLE_FILE === "1";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Atelier — Your data workspace",
      },
    ],
    links: [
      ...(isSingleFile
        ? []
        : [
            {
              rel: "icon",
              href: "/favicon.ico",
              type: "image/x-icon",
            },
            {
              rel: "shortcut icon",
              href: "/favicon.ico",
            },
          ]),
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <WorkspaceProvider>{children}</WorkspaceProvider>
        <Scripts />
      </body>
    </html>
  );
}
