export default function StoragesLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-neutral-200 rounded animate-pulse mt-2" />
                </div>
                <div className="h-10 w-10 bg-neutral-200 rounded-full animate-pulse" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-neutral-200 bg-white rounded-lg p-4 h-44 animate-pulse space-y-3">
                        <div className="h-5 w-40 bg-neutral-200 rounded" />
                        <div className="h-4 w-28 bg-neutral-200 rounded" />
                        <div className="h-3 w-24 bg-neutral-200 rounded" />
                        <div className="flex gap-2">
                            <div className="h-6 w-16 bg-neutral-200 rounded" />
                            <div className="h-6 w-20 bg-neutral-200 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
