export default function PointsOfSaleLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-neutral-200 rounded animate-pulse mt-2" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-neutral-200 bg-white rounded-lg p-4 h-40 animate-pulse">
                        <div className="h-12 w-12 bg-neutral-200 rounded-full" />
                        <div className="h-4 w-32 bg-neutral-200 rounded mt-3" />
                        <div className="h-3 w-24 bg-neutral-200 rounded mt-2" />
                    </div>
                ))}
            </div>
        </div>
    );
}
