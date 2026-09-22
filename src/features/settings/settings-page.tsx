import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckCircle2Icon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import { modelIds, models } from "@/lib/llm";
import type { ModelId } from "@/lib/llm";
import { completeDeviceLogin, getPbiAccount, signOutPbi, startDeviceLogin } from "@/lib/pbi-auth";
import type { DeviceLogin } from "@/lib/pbi-auth";
import { readSettings, writeSettings } from "@/lib/settings";
import { errorMessage } from "@/lib/utils";

export function SettingsPage() {
  const [settings, setSettings] = useState(readSettings);
  const save = (patch: Partial<typeof settings>) => {
    setSettings(writeSettings(patch));
    toast.add({ title: "Settings saved", type: "success" });
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="grid grid-cols-3 items-center">
        <Button variant="outline" className="justify-self-start" nativeButton={false} render={<Link to="/agent" />}>
          <ArrowLeftIcon />
          Back
        </Button>
        <h1 className="text-center text-lg font-semibold">Settings</h1>
      </header>

      <PowerBiCard />

      <Card>
        <CardHeader>
          <CardTitle>AI</CardTitle>
          <CardDescription>The token is stored in local storage and sent only to the AI API.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              save({ aiToken: String(data.get("aiToken")).trim(), defaultModel: data.get("model") as ModelId });
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="aiToken">AI token</FieldLabel>
                <Input id="aiToken" name="aiToken" type="password" defaultValue={settings.aiToken} placeholder="sk-…" />
              </Field>
              <Field>
                <FieldLabel htmlFor="model">Default model</FieldLabel>
                <NativeSelect id="model" name="model" defaultValue={settings.defaultModel} className="w-full">
                  {modelIds.map((id) => (
                    <option key={id} value={id}>
                      {models[id].label} — {models[id].description}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <div className="flex justify-end">
                <Button type="submit">Save</Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PowerBiCard() {
  const queryClient = useQueryClient();
  const account = useQuery({ queryKey: ["pbi-account"], queryFn: getPbiAccount });
  const [login, setLogin] = useState<DeviceLogin | null>(null);
  const abort = useRef<AbortController | null>(null);
  const refreshAccount = () => queryClient.invalidateQueries({ queryKey: ["pbi-account"] });

  useEffect(() => () => abort.current?.abort(), []);

  const signIn = useMutation({
    mutationFn: async () => {
      abort.current = new AbortController();
      const started = await startDeviceLogin();
      setLogin(started);
      window.open(started.verificationUri, "_blank", "noopener");
      return completeDeviceLogin(started, abort.current.signal);
    },
    onSettled: () => setLogin(null),
    onSuccess: refreshAccount,
  });
  const signOut = useMutation({ mutationFn: signOutPbi, onSuccess: refreshAccount });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Power BI</CardTitle>
        <CardDescription>
          Sign in once with a device code (generic &quot;organizations&quot; tenant). Tokens are kept in local storage and refreshed automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
          {account.data ? (
            <>
              <span className="flex items-center gap-2 text-sm">
                <CheckCircle2Icon className="size-4 text-green-600" />
                {account.data}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut.mutate()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">Not signed in</span>
              <Button size="sm" disabled={signIn.isPending} onClick={() => signIn.mutate()}>
                Sign in to Power BI
              </Button>
            </>
          )}
        </div>
        {login && (
          <div className="flex flex-col items-center gap-3 rounded-md bg-muted p-4 text-center text-sm">
            <p>
              Open{" "}
              <a href={login.verificationUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                {login.verificationUri}
                <ExternalLinkIcon className="size-3" />
              </a>{" "}
              and enter this code:
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-background px-3 py-1.5 font-mono text-lg tracking-widest">{login.userCode}</code>
              <Button variant="ghost" size="icon-sm" aria-label="Copy code" onClick={() => navigator.clipboard.writeText(login.userCode)}>
                <CopyIcon />
              </Button>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3" />
              Waiting for you to finish signing in…
            </p>
          </div>
        )}
        {signIn.error && <FieldError>{errorMessage(signIn.error)}</FieldError>}
      </CardContent>
    </Card>
  );
}
