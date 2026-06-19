/**
 * HostelHub motion primitives — a thin, opinionated layer over framer-motion so
 * every page gets the same premium, restrained motion language:
 *   • Reveal      — fade + rise on mount (one-shot)
 *   • Stagger     — container that cascades its children in
 *   • StaggerItem — a child of <Stagger> (rows, cards, list items)
 *   • AnimatedNumber — counts up to a value (dashboards / stat tiles)
 *
 * Everything respects prefers-reduced-motion automatically.
 */
import { useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from 'framer-motion';

/* Shared easing — matches the CSS cubic-bezier used elsewhere in the app. */
export const EASE = [0.16, 1, 0.3, 1];

export const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.03 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
};

/* A lighter rise for dense rows (tables), so long lists don't feel sluggish. */
export const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

/** Fade + rise once on mount. `as` picks the element (div/section/li/tr…). */
export function Reveal({ children, delay = 0, y = 12, as = 'div', className = '', ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Container that cascades its <StaggerItem> children into view. */
export function Stagger({ children, as = 'div', className = '', ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      variants={reduce ? undefined : containerVariants}
      initial={reduce ? false : 'hidden'}
      animate="show"
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** A child of <Stagger>. Carries the per-item rise; add `whileHover` etc. freely. */
export function StaggerItem({ children, as = 'div', className = '', ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag className={className} variants={reduce ? undefined : itemVariants} {...rest}>
      {children}
    </Tag>
  );
}

/** A staggered table row. Drop-in for <tr> inside the shared <Table>. */
export function TableRow({ children, className = '', ...rest }) {
  const reduce = useReducedMotion();
  return (
    <motion.tr className={className} variants={reduce ? undefined : rowVariants} {...rest}>
      {children}
    </motion.tr>
  );
}

/** Smoothly counts up to `value`. Pass a `format` fn for ₹, %, etc. */
export function AnimatedNumber({
  value = 0,
  format = (n) => Math.round(n).toLocaleString('en-IN'),
  duration = 0.9,
  className = '',
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (n) => format(n));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: EASE });
    return controls.stop;
  }, [value, duration, reduce, mv]);

  return <motion.span className={className}>{text}</motion.span>;
}
