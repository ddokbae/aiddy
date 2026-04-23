export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[#EDF4F2]">
      <div className="max-w-2xl w-full text-center">
        {/* Brand mark (해달 자리 — 나중에 이미지로 교체) */}
        <div className="mb-8 text-6xl">🦦</div>

        {/* Logo */}
        <h1 className="text-5xl font-semibold tracking-tight text-[#3D5A58] mb-4">
          Aiddy
        </h1>

        {/* Tagline */}
        <p className="text-lg text-[#3D5A58]/80 mb-3">
          AI와 함께 배우는 모든 순간을 기록합니다.
        </p>
        <p className="text-base text-[#7BA5A3] mb-12">
          Your AI learning buddy · Never forget what you built today.
        </p>

        {/* CTA — 지금은 동작 안 함, 디자인만 */}
        <button
          className="px-8 py-4 rounded-xl bg-[#7BA5A3] text-white font-medium
                     hover:bg-[#3D5A58] transition-colors duration-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Select your project folder
        </button>

        {/* Status hint */}
        <p className="mt-6 text-sm text-[#7BA5A3]/70">
          coming very soon 🐚
        </p>
      </div>
    </main>
  );
}