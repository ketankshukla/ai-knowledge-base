import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 text-center dark:bg-black">
      <h1 className="max-w-md text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        AI Knowledge Base
      </h1>
      <p className="mt-4 max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Upload your documents and get grounded answers with citations, backed
        by your own private, secure workspace.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/signup"
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
