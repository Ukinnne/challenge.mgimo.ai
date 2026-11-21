import Icon from '../components/Icon.jsx'

export default function ComingSoon({ title, icon, text }) {
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="panel empty">
        <Icon name={icon} size={40} />
        <h2>Раздел в разработке</h2>
        <p>{text}</p>
      </div>
    </>
  )
}