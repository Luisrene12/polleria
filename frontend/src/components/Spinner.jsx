export default function Spinner() {
  return (
    <div className="flex justify-center items-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <span className="text-2xl">🍗</span>
        </div>
      </div>
    </div>
  );
}