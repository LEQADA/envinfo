#!/usr/bin/env node
'use strict';

var child_process = require('child_process');
var os = require('os');
var osName = require('os-name');
var which = require('which');
var copypasta = require("copy-paste");

function run(cmd) {
  return (child_process.execSync(cmd, {
      stdio: [0, 'pipe', 'ignore']
    }).toString() || '').trim();
}

function getXcodeVersion() {
  var xcodeVersion;
  var xcodePath = which.sync('xcodebuild');
  if (process.platform === 'darwin') {
    try {
      xcodeVersion = xcodePath && run(xcodePath + ' -version').split('\n').join(' ');
    } catch (err) {
      xcodeVersion = 'Not Found';
    }
  } else {
    xcodeVersion = 'N/A';
  }
  return xcodeVersion;
}

function getAndroidStudioVersion() {
  var androidStudioVersion = 'Not Found';
  if (process.platform === 'darwin') {
    try {
      androidStudioVersion = run(
          [
            '/usr/libexec/PlistBuddy',
            '-c',
            'Print:CFBundleShortVersionString',
            '-c',
            'Print:CFBundleVersion',
            '/Applications/Android\ Studio.app/Contents/Info.plist'
          ].join(' ')
        )
        .split('\n')
        .join(' ');
    } catch (err) {
      androidStudioVersion = 'Not Found';
    }
  } else if (process.platform === 'linux') {
    try {
      var linuxBuildNumber = run('cat /opt/android-studio/build.txt');
      var linuxVersion = run('cat /opt/android-studio/bin/studio.sh | grep "$Home/.AndroidStudio" | head -1')
        .match(/\d\.\d/)[0];
      androidStudioVersion = `${linuxVersion} ${linuxBuildNumber}`;
    } catch (err) {
      androidStudioVersion = 'Not Found';
    }
  } else if (process.platform.startsWith('win')) {
    try {
      var windowsVersion = run(
          'wmic datafile where name="C:\\\\Program Files\\\\Android\\\\Android Studio\\\\bin\\\\studio.exe" get Version'
        )
        .replace(/(\r\n|\n|\r)/gm, '');
      var windowsBuildNumber = run('type "C:\\\\Program Files\\\\Android\\\\Android Studio\\\\build.txt"')
        .replace(/(\r\n|\n|\r)/gm, '');
      androidStudioVersion = `${windowsVersion} ${windowsBuildNumber}`;
    } catch (err) {
      androidStudioVersion = 'Not Found';
    }
  }
  return androidStudioVersion;
}

function getNpmVersion() {
  var npmVersion;
  try {
    npmVersion = run('npm -v');
  } catch (error) {
    npmVersion = 'Not Found';
  }
  return npmVersion;
}

function getYarnVersion() {
  var yarnVersion;
  try {
    yarnVersion = run('yarn --version');
  } catch (error) {
    yarnVersion = 'Not Found';
  }
  return yarnVersion;
}

function getOperatingSystemInfo() {
  var operatingSystemInfo;
  try {
    var operatingSystemInfo = osName(os.platform(), os.release());
    if (process.platform === 'darwin') {
      operatingSystemInfo = operatingSystemInfo + ' ' + run('sw_vers -productVersion ');
    }
  } catch (err) {
    operatingSystemInfo = operatingSystemInfo + ' Unknown Version';
  }
  return operatingSystemInfo;
}

function getNodeVersion() {
  var nodeVersion;
  try {
    nodeVersion = run('node --version').replace('v', '');
  } catch (error) {
    nodeVersion = 'Not Found';
  }
  return nodeVersion;
}

function getWatchmanVersion() {
  var watchmanVersion;
  try {
    var watchmanPath = which.sync('watchman');
    watchmanVersion = watchmanPath && run(watchmanPath + ' --version');
  } catch (error) {
    watchmanVersion = 'Not Found';
  }
  return watchmanVersion;
}

module.exports.print = function(options) {
  var log = [];

  log.push('');
  log.push('Environment:');
  log.push('  OS: ' + getOperatingSystemInfo());
  log.push('  Node: ' + getNodeVersion());
  log.push('  Yarn: ' + getYarnVersion());
  log.push('  npm: ' + getNpmVersion());
  log.push('  Watchman: ' + getWatchmanVersion());
  log.push('  Xcode: ' + getXcodeVersion());
  log.push('  Android Studio: ' + getAndroidStudioVersion());
  log.push('');

  if (options) {
    if (options.packages) {
      try {
        var packageJson = require(process.cwd() + '/package.json');
      } catch (err) {
        log.push('ERROR: package.json not found!');
        log.push('');
        return;
      }

      log.push('Packages: (wanted => installed)');

      var devDependencies = packageJson.devDependencies || {};
      var dependencies = packageJson.dependencies || {};
      var allDependencies = Object.assign({}, devDependencies, dependencies);
      var logFunction = function(dep) {
        if (allDependencies[dep]) {
          var wanted = allDependencies[dep];
          var installed;
          try {
            installed = require(process.cwd() + '/node_modules/' + dep + '/package.json').version;
          } catch (err) {
            installed = 'Not Installed';
          }
          log.push('  ' + dep + ': ' + wanted + ' => ' + installed);
        }
      };

      if (Array.isArray(options.packages)) {
        options.packages.map(logFunction);
      } else if (typeof options.packages === 'string') {
        options.packages.split(',').map(logFunction);
      } else if (typeof options.packages === 'boolean') {
        Object.keys(allDependencies).map(logFunction);
      }

      log.push('');
    }

    if (options.clipboard) {
      copypasta.copy(log.join('\n'))
    }
  }

  console.log(log.join('\n'));
};
