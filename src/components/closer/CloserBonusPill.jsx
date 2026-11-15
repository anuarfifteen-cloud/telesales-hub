/** Compact progress pill shown while playing bonus play 1 or 2 of today's +3. */
export default function CloserBonusPill({ play, total }) {
  return (
    <p className="rounded-full bg-[#241242]/85 px-2 py-0.5 text-center text-[7px] font-black uppercase tracking-[0.1em] text-purple-200 ring-1 ring-purple-300/35 backdrop-blur-sm sm:text-[8px]">
      Bonus Play {play}/{total} • {total}/{total} = 💎 Diamond Round
    </p>
  );
}