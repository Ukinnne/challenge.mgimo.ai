import PageHeader from '../components/PageHeader.jsx'
import { EmptyState } from '../components/States.jsx'

export default function ComingSoon({ title, icon, text }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={icon} title="Раздел в разработке" text={text} />
    </>
  )
}