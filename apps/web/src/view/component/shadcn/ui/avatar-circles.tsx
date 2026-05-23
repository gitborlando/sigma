import { cn } from '../lib/utils'

interface Avatar {
  imageUrl: string
  color: string
}
interface AvatarCirclesProps {
  className?: string
  numPeople?: number
  avatarUrls: Avatar[]
  onClick?: () => void
}

export const AvatarCircles = forwardRef<HTMLDivElement, AvatarCirclesProps>(
  ({ numPeople, className = '', avatarUrls, onClick }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('z-10 flex -space-x-2 rtl:space-x-reverse', className)}
        onClick={onClick}>
        {avatarUrls.map((url, index) => (
          <div key={index}>
            <img
              key={index}
              className='h-8 w-8 rounded-full border-2 border-white dark:border-gray-800'
              src={url.imageUrl}
              width={40}
              height={40}
              alt={`Avatar ${index + 1}`}
              style={{ borderColor: url.color }}
            />
          </div>
        ))}
        {(numPeople ?? 0) > 0 && (
          <div className='flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-black! text-center text-xs font-medium text-white hover:bg-gray-600 dark:border-gray-800 dark:bg-white dark:text-black'>
            +{numPeople}
          </div>
        )}
      </div>
    )
  },
)
