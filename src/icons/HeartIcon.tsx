import { IconBase, type IconProps } from './IconBase'

export function HeartIcon(props: IconProps) {
  return (
    <IconBase viewBox="0 0 100 100" {...props}>
      <path
        fill="currentColor"
        d="M50 88C31 72 12 56 12 35C12 23 21 14 33 14C41 14 47 18 50 25C53 18 59 14 67 14C79 14 88 23 88 35C88 56 69 72 50 88Z"
      />
    </IconBase>
  )
}
