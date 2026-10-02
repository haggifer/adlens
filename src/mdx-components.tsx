import { toAnchorId } from '@/components/legal/anchor'
import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'

const getAnchorId = (children: ReactNode) => (typeof children === 'string' ? toAnchorId(children) : undefined)

const components: MDXComponents = {
    h2: ({ children }) => <h2 id={getAnchorId(children)}>{children}</h2>,
    h3: ({ children }) => <h3 id={getAnchorId(children)}>{children}</h3>,
    a: ({ href, children }) =>
        href?.startsWith('http') ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
            </a>
        ) : (
            <a href={href}>{children}</a>
        ),
}

export const useMDXComponents = (): MDXComponents => components
