/* ===== achilles-v10-1-system-chrome ===== */

(function(){
    const palettes = {
        dark: { gold:'#000000', blood:'#000000', sky:'#000000' },
        light: { gold:'#FFFBF4', blood:'#FFF7F8', sky:'#F7FBFF' }
    };
    function syncSystemChrome(){
        const root = document.documentElement;
        const mode = root.getAttribute('data-theme') || 'dark';
        const color = root.getAttribute('data-color') || 'gold';
        const value = palettes[mode]?.[color] || (mode === 'light' ? '#F7F7F7' : '#000000');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', value);
    }
    syncSystemChrome();
    new MutationObserver(syncSystemChrome).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme','data-color'] });
})();

