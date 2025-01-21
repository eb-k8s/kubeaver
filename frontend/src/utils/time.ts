export function formatTime(timestamp) {
    // 如果时间戳是字符串，先将其转换为数字
    if (typeof timestamp === 'string') {
        timestamp = parseInt(timestamp, 10);  // 转换为数字
    }

    // 如果是秒级时间戳，将其转换为毫秒
    if (String(timestamp).length === 10) {
        timestamp *= 1000;
    }

    const parsedTimestamp = new Date(timestamp);

    // 检查日期是否有效
    if (isNaN(parsedTimestamp.getTime())) {
        return 'Invalid Date';
    }

    const year = parsedTimestamp.getFullYear();
    const month = String(parsedTimestamp.getMonth() + 1).padStart(2, '0');
    const day = String(parsedTimestamp.getDate()).padStart(2, '0');
    const hours = String(parsedTimestamp.getHours()).padStart(2, '0');
    const minutes = String(parsedTimestamp.getMinutes()).padStart(2, '0');
    const seconds = String(parsedTimestamp.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
