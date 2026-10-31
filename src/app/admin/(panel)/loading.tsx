export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="skeleton mt-3 h-4 w-72 max-w-full rounded-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-32 rounded-3xl" />
        ))}
      </div>
      <div className="skeleton mt-4 h-72 rounded-3xl" />
    </div>
  );
}
