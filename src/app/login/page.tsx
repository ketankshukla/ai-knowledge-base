import Link from "next/link";
import { GoogleAuthButton } from "../google-auth-button";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Log in
        </h1>
        <GoogleAuthButton label="Continue with Google" />
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          New here?{" "}
          <Link href="/signup" className="font-medium text-zinc-900 underline dark:text-zinc-50">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
