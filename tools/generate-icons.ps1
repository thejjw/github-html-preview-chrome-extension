param()

Add-Type -AssemblyName System.Drawing
$outputDirectory = Join-Path $PSScriptRoot "..\icons"
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

foreach ($size in 16, 32, 48, 128) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.Clear([System.Drawing.Color]::FromArgb(36, 41, 47))
        $margin = [Math]::Max(1, [int]($size * 0.14))
        $penWidth = [Math]::Max(1, [single]($size * 0.08))
        $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(46, 160, 67), $penWidth)
        $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
        try {
            $graphics.DrawRectangle($pen, $margin, $margin, $size - 2 * $margin, $size - 2 * $margin)
            $font = [System.Drawing.Font]::new("Arial", [Math]::Max(6, $size * 0.30), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
            try {
                $format = [System.Drawing.StringFormat]::new()
                $format.Alignment = [System.Drawing.StringAlignment]::Center
                $format.LineAlignment = [System.Drawing.StringAlignment]::Center
                $graphics.DrawString("<>" , $font, $brush, [System.Drawing.RectangleF]::new(0, 0, $size, $size), $format)
                $format.Dispose()
            } finally { $font.Dispose() }
        } finally { $pen.Dispose(); $brush.Dispose() }
        $bitmap.Save((Join-Path $outputDirectory "icon$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
}
