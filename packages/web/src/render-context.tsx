import React, { createContext, useContext } from 'react'
import type { GraphTransaction } from '@akta/txn-graph-core'

export type RenderLinkProps = { href: string; className?: string; children: React.ReactNode }

export type RenderSlots = {
  /**
   * Extra detail for one transaction, shown when its row in the panel is
   * expanded. Receives the transaction as passed in (use `original` to reach
   * your own model).
   */
  renderTransactionDetails?: (txn: GraphTransaction) => React.ReactNode
  /**
   * Render links produced by `DataProvider.resolveHref` — swap in your
   * router's `<Link>` to avoid full page loads. Default: a plain `<a>`.
   */
  renderLink?: (props: RenderLinkProps) => React.ReactNode
  /** Scope enter animation. Resolved by `<TxnGraph>`; see `TxnGraphProps.animate`. */
  animate?: boolean
}

export const RenderContext = createContext<RenderSlots>({})

export function useRenderSlots(): RenderSlots {
  return useContext(RenderContext)
}

/** A resolved href rendered through `renderLink`, or plain children when there is none. */
export function MaybeLink({ href, className, children }: { href: string | null; className?: string; children: React.ReactNode }) {
  const { renderLink } = useRenderSlots()
  if (!href) return <>{children}</>
  return renderLink ? (
    <>{renderLink({ href, className, children })}</>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  )
}
