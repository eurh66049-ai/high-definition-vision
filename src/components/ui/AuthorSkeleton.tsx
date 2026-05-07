import { Skeleton } from "@/components/ui/skeleton";

const AuthorSkeleton = () => {
  return (
    <div className="flex items-start gap-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {/* Avatar skeleton */}
      <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
      
      <div className="flex-1 space-y-3">
        {/* Name and follow button */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        
        {/* Followers count */}
        <Skeleton className="h-4 w-20" />
        
        {/* Bio lines */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
};

export default AuthorSkeleton;