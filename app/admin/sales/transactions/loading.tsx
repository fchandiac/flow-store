import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';

export default function Loading() {
    return (
        <div className="flex min-h-[320px] items-center justify-center">
            <DotProgress />
        </div>
    );
}
