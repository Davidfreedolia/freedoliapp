import { useApp } from '../context/AppContext'

export default function Header({ title }) {
  const { darkMode } = useApp()

  // Header simplificat: només títol, sense actions (TopNavbar s'encarrega)
  return (
    <div style={{
      ...styles.header,
      backgroundColor: 'transparent',
      borderBottom: 'none',
      boxShadow: 'none',
      padding: '24px 32px 16px 32px'
    }}>
      <h1 style={{
        ...styles.title,
        color: darkMode ? '#ffffff' : '#111827'
      }}>
        {title}
      </h1>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600'
  }
}
