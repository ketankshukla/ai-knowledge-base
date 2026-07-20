import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function AppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Knowledge base
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Signed in as {user.email}
          </p>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 px-6 py-8">
        <p className="text-zinc-600 dark:text-zinc-400">
          Your documents and chat will show up here.
        </p>
      </main>
    </div>
  );
}
