'use client'

import { DatePicker, Input, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { isJobFilterActive, JOB_PERIOD_PRESETS, type JobFilter, type JobPeriod, toJobPeriod } from './admin-job-filter'

type PeriodValue = [Dayjs | null, Dayjs | null] | null

const FIELD_STYLE = { width: '16rem' }

const PERIOD_FORMAT = 'YYYY-MM-DD HH:mm'

const untilNow = (getFrom: (now: Dayjs) => Dayjs) => (): [Dayjs, Dayjs] => {
    const now = dayjs()

    return [getFrom(now), now]
}

// Functions, so the picker shows each range as of the moment it's picked.
const PERIOD_PRESETS = JOB_PERIOD_PRESETS.map(({ label, getFrom }) => ({ label, value: untilNow(getFrom) }))

// A range picked by hand runs from the first day's midnight to the end of the last day.
const SHOW_TIME = { defaultOpenValue: [dayjs().startOf('day'), dayjs().endOf('day')] }

const toPeriod = (value: PeriodValue): JobPeriod | null => {
    const [from, to] = value ?? []

    return from && to ? toJobPeriod(from, to, dayjs()) : null
}

export const formatJobCount = (shownCount: number, totalCount: number): string => `${shownCount} of ${totalCount} jobs`

interface IProps {
    filter: JobFilter
    onChange: (filter: JobFilter) => void
    shownCount: number
    totalCount: number
}

export function JobFilters({ filter, onChange, shownCount, totalCount }: IProps) {
    return (
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <Input
                aria-label="User email"
                placeholder="User email"
                allowClear
                className="mw-100"
                style={FIELD_STYLE}
                value={filter.email}
                onChange={(event) => onChange({ ...filter, email: event.target.value })}
            />
            <Input
                aria-label="User id"
                placeholder="User id"
                allowClear
                className="mw-100"
                style={FIELD_STYLE}
                value={filter.userId}
                onChange={(event) => onChange({ ...filter, userId: event.target.value })}
            />
            <DatePicker.RangePicker
                aria-label="Created"
                className="mw-100"
                placeholder={['Created from', 'to']}
                allowEmpty={[false, false]}
                showTime={SHOW_TIME}
                format={PERIOD_FORMAT}
                presets={PERIOD_PRESETS}
                onChange={(value) => onChange({ ...filter, period: toPeriod(value) })}
            />
            {isJobFilterActive(filter) && (
                <Typography.Text type="secondary">{formatJobCount(shownCount, totalCount)}</Typography.Text>
            )}
        </div>
    )
}
