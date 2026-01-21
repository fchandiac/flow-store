import DotProgress from "@/baseComponents/DotProgress/DotProgress";

export default function Loading() {
    return (
        <div className="p-6 h-full flex flex-col items-center justify-center space-y-4">
            <DotProgress />
            <p className="text-neutral-500 font-medium animate-pulse">
                Cargando estado de cuentas por cobrar...
            </p>
        </div>
    );
}
