import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';

export default function Loading() {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="text-center">
                <DotProgress />
            </div>
        </div>
    );
}
