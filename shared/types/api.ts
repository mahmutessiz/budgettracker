import type { CategoryId } from '#shared/utils/categories'
import type { Money } from '#shared/utils/currency'

/**
 * `amount` kuruş cinsinden girilen tutardır. `amounts` kayıt anındaki kurla
 * hesaplanmış karşılıklardır; özetler de bu sabit değerlerin toplamıdır.
 */
export interface ExpenseDTO {
  id: string
  amount: number
  amounts: Money
  date: string
  category: CategoryId
  description: string
  note: string | null
  /** Kullanılan ECB kurunun tarihi; henüz kur alınamadıysa null */
  fxDate: string | null
  fxRates: Partial<Record<string, number>> | null
}

export interface ExpenseListResponse {
  items: ExpenseDTO[]
  count: number
  sum: Money
  page: number
  pageSize: number
}

export interface CategoryTotal {
  category: CategoryId
  total: Money
}

export interface MonthTotal {
  month: string
  total: Money
}

export interface MonthSummary {
  month: string
  total: Money
  count: number
  prevTotal: Money
  byCategory: CategoryTotal[]
  trend: MonthTotal[]
  recent: ExpenseDTO[]
  topDay: { date: string; description: string } | null
}

export interface OverviewResponse {
  from: string
  to: string
  months: MonthTotal[]
  total: Money
  count: number
  byCategory: CategoryTotal[]
  compare: {
    current: string
    previous: string
    rows: { category: CategoryId; previous: Money; current: Money }[]
  }
}

export interface AdminUserDTO {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  lastLoginAt: string | null
  mustChangePassword: boolean
}
