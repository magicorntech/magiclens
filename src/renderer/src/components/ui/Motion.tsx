import { motion, type HTMLMotionProps } from 'framer-motion'
import { motion as motionTokens } from '../../design-system/tokens'

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: motionTokens.fast }
}

export const slideUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: motionTokens.normal, ease: 'easeOut' as const }
}

export const slideRight = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12 },
  transition: { duration: motionTokens.normal, ease: 'easeOut' as const }
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: motionTokens.fast }
}

export function MotionDiv(props: HTMLMotionProps<'div'>): React.JSX.Element {
  return <motion.div {...props} />
}

export function MotionSection(props: HTMLMotionProps<'section'>): React.JSX.Element {
  return <motion.section {...props} />
}
