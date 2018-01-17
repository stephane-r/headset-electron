// Formats logs and returns 3xN array, where N is the number of lines in the log
function formatLogs(logs) {
  return logs
    .map((line) => {
      line = line.split(' ');
      return [line[0], line[1], line.splice(2).join(' ')];
    });
}

// Prints a color output of the formatted logs, preserving structure as in DEBUG module
function printFormatedLogs(logs) {
  let previous = null;
  logs.forEach((log) => {
    if (log[0] && log[1]) {
      if (!Number.isNaN(Date.parse(log[0]))) {
        console.log('\t\x1b[33m%s \x1b[34m%s\x1b[0m', log[0], log[1], log[2]);
        previous = log;
      } else { console.log('\t\x1b[31m%s\x1b[0m', log); }
    } else if (previous) {
      console.log('\t\x1b[33m%s \x1b[34m%s\x1b[0m', previous[0], previous[1], log[2]);
    }
  });
}

// Prints all the returned logs with some formatting.
function printLogs(logs) {
  printFormatedLogs(formatLogs(logs));
}

// Finds the string 'element' on the logs array
function isElement(logs, element) {
  return formatLogs(logs).some(line => line[2].includes(element));
}

exports.printLogs = printLogs;
exports.isElement = isElement;
