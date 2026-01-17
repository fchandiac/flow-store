const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DEVICE_FILTER_FILE_NAME = 'device_filter.xml';
const DEFAULT_XML_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <usb-device vendor-id="0x0FE6" product-id="0x811E" />
    <usb-device vendor-id="0x0416" product-id="0x5011" />
    <usb-device class="0x07" subclass="0x01" protocol="0x02" />
</resources>
`;

function ensureDeviceFilterFile(projectRoot, xmlContent = DEFAULT_XML_CONTENT) {
  const xmlDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
  fs.mkdirSync(xmlDir, { recursive: true });
  const filePath = path.join(xmlDir, DEVICE_FILTER_FILE_NAME);
  fs.writeFileSync(filePath, xmlContent, { encoding: 'utf8' });
}

module.exports = function withUsbPrinterDeviceFilter(config, pluginProps = {}) {
  return withDangerousMod(config, ['android', async modConfig => {
    const { xmlContent } = pluginProps;
    ensureDeviceFilterFile(modConfig.modRequest.projectRoot, xmlContent);
    return modConfig;
  }]);
};
