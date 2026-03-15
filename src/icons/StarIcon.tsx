import { IconBase, type IconProps } from './IconBase'

export function StarIcon(props: IconProps) {
  return (
    <IconBase viewBox="0 0 100 100" {...props}>
      <path
        fill="currentColor"
        d="M50 10L61.2 35.6L89 38.8L68 57.5L74 85L50 71.2L26 85L32 57.5L11 38.8L38.8 35.6L50 10Z"
      />
    </IconBase>
  )
}
