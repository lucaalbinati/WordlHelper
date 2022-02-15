
export function isOutdated(lastModified) {
    let todayDay = new Date()
    todayDay.setHours(0, 0, 0, 0)
    let lastModifiedDay = new Date(lastModified)
    lastModifiedDay.setHours(0, 0, 0, 0)
    return todayDay.toUTCString() != lastModifiedDay.toUTCString()
}