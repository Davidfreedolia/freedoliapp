export default function PageGutter({ className = "", style = {}, children }) {
  return <div className={`page-gutter ${className}`.trim()} style={style}>{children}</div>
}
