"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-screen w-screen bg-[#0a0f1e] flex items-center justify-center">
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-2xl p-8 max-w-md text-center">
        <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
        <h2 className="text-[#f0f4f8] text-lg font-bold mb-2">Something went wrong</h2>
        <p className="text-[#8892a4] text-sm mb-4">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 rounded-xl bg-[#00f0ff] text-[#0a0f1e] font-semibold text-sm hover:bg-[#00d4e0] cursor-pointer"
        >
          Try again
        </button>
        <div className="mt-4">
          <a href="/" className="text-xs text-[#8892a4] hover:text-[#00f0ff]">
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
