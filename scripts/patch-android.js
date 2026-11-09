// Ajusta el proyecto de Android que genera Capacitor:
// permiso de micrófono y acceso al servicio de reconocimiento de voz del teléfono (Android 11+),
// y número de versión de la app tomado de package.json.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
let m = fs.readFileSync(manifestPath, 'utf8');

const perms = ['android.permission.RECORD_AUDIO', 'android.permission.INTERNET', 'android.permission.POST_NOTIFICATIONS', 'android.permission.VIBRATE'];
for (const p of perms) {
  if (!m.includes(`android:name="${p}"`)) {
    m = m.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
  }
}
if (!m.includes('android.speech.RecognitionService')) {
  m = m.replace('</manifest>', '    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService" />\n        </intent>\n    </queries>\n</manifest>');
}
fs.writeFileSync(manifestPath, m);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
let g = fs.readFileSync(gradlePath, 'utf8');
const runNumber = parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10);
g = g.replace(/versionCode\s+\d+/, `versionCode ${runNumber}`);
g = g.replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);
fs.writeFileSync(gradlePath, g);

// Android 15 dibuja la app debajo de la barra de estado: se pide que no lo haga (la parte de arriba se veía cortada)
const stylesPath = path.join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');
if (fs.existsSync(stylesPath)) {
  let st = fs.readFileSync(stylesPath, 'utf8');
  if (!st.includes('windowOptOutEdgeToEdgeEnforcement')) {
    st = st.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowOptOutEdgeToEdgeEnforcement" tools:targetApi="35">true</item>');
    if (!st.includes('xmlns:tools')) st = st.replace('<resources>', '<resources xmlns:tools="http://schemas.android.com/tools">');
    fs.writeFileSync(stylesPath, st);
  }
}

// WhatsApp y WhatsApp Business: abrir enlaces intent:// (con el paquete elegido) y whatsapp:// desde la app
if (!m.includes('com.whatsapp.w4b')) {
  m = m.replace('</manifest>', '    <queries>\n        <package android:name="com.whatsapp" />\n        <package android:name="com.whatsapp.w4b" />\n    </queries>\n</manifest>');
  fs.writeFileSync(manifestPath, m);
}
const mainDir = path.join(root, 'android', 'app', 'src', 'main', 'java', 'ar', 'odontovoz', 'app');
fs.mkdirSync(mainDir, { recursive: true });
fs.writeFileSync(path.join(mainDir, 'MainActivity.java'), `package ar.odontovoz.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (bridge != null) bridge.setWebViewClient(new OvClient(bridge));
    }

    private void openIntent(String u) {
        Intent i;
        try { i = Intent.parseUri(u, Intent.URI_INTENT_SCHEME); } catch (Exception e) { return; }
        i.addCategory(Intent.CATEGORY_BROWSABLE);
        i.setComponent(null);
        i.setSelector(null);
        try {
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            String f = i.getStringExtra("browser_fallback_url");
            if (f != null) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(f))); } catch (Exception e2) { /* nada */ }
            }
        } catch (Exception e) { /* nada */ }
    }

    private class OvClient extends BridgeWebViewClient {
        OvClient(Bridge b) { super(b); }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String u = request.getUrl().toString();
            if (u.startsWith("intent:")) { openIntent(u); return true; }
            if (u.startsWith("whatsapp:")) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u))); } catch (Exception e) { /* nada */ }
                return true;
            }
            return super.shouldOverrideUrlLoading(view, request);
        }
    }
}
`);

console.log('Android listo: micrófono habilitado, versión', pkg.version, '(' + runNumber + ')');
