export default function PageGutter({ className = "", style = {}, children }) {
  return <div className={`page-gutter ${className}`.trim()} data-layout="page-gutter" style={style}>{children}</div>
}
