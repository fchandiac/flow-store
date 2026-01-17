package com.imin.screend1demo

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.*
import android.net.Uri
import android.os.Bundle
import android.os.Looper
import android.os.StrictMode
import android.util.Log
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.imin.image.ILcdManager
import com.imin.image.StringUtils
import java.io.FileNotFoundException


class MainActivity : AppCompatActivity() {
    var bitmap:Bitmap? =null
    @SuppressLint("ResourceType")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
            != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(this,
                arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE,
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.MOUNT_UNMOUNT_FILESYSTEMS),
                0)
        }

//        StrictMode.setThreadPolicy(StrictMode.ThreadPolicy.Builder()
//            .detectNetwork()
//            .penaltyLog()
//            .build())

        findViewById<TextView>(R.id.send1).setOnClickListener {

//            ILcdManager.getInstance(this).sendLCDCommand(
//                StringUtils.getNumber(findViewById<EditText>(R.id.etNumber).text.toString().trim()))
            ILcdManager.getInstance(this).sendLCDCommand(1)
            ILcdManager.getInstance(this).sendLCDCommand(4)
        }

        findViewById<TextView>(R.id.send2).setOnClickListener {

            //findViewById<ImageView>(R.id.iv).setImageBitmap(ILcdManager.getInstance(this).getTextBitmap(findViewById<EditText>(R.id.etNumber).text.toString().trim()))
             //   ILcdManager.getInstance(this).sendLCDCommand(4)
                ILcdManager.getInstance(this)
                    .sendLCDString(findViewById<EditText>(R.id.etNumber).text.toString().trim())
        }
        findViewById<TextView>(R.id.send3).setOnClickListener {
                val strings3 = arrayOf("سعيد بلقائك", "Des", "嗨嗨")
                val colsAlign3 = intArrayOf(0, 1, 2)
            //    ILcdManager.getInstance(this).sendLCDCommand(4)
                // findViewById<ImageView>(R.id.iv).setImageBitmap(ILcdManager.getInstance(this).getTableBitMap(strings3,colsAlign3))
                ILcdManager.getInstance(this).sendLCDMultiString(strings3, colsAlign3)

        }
        findViewById<TextView>(R.id.send4).setOnClickListener {
            //    ILcdManager.getInstance(this).sendLCDCommand(4)
            findViewById<EditText>(R.id.etNumber).textSize =
                StringUtils.getNumber(findViewById<EditText>(R.id.etSize).text.toString().trim()).toFloat()
           // findViewById<ImageView>(R.id.iv).setImageBitmap(ILcdManager.getInstance(this).getTextBitmap(findViewById<EditText>(R.id.etNumber).text.toString().trim()))

            ILcdManager.getInstance(this).sendLCDFillStringWithSize(findViewById<EditText>(R.id.etNumber).text.toString().trim(),
                StringUtils.getNumber(findViewById<EditText>(R.id.etSize).text.toString().trim()))
        }
        findViewById<TextView>(R.id.send5).setOnClickListener {
             //   ILcdManager.getInstance(this).sendLCDCommand(4)
            val s: String = findViewById<EditText>(R.id.etNumber).text.toString().trim() + "\n" + findViewById<EditText>(R.id.etSize).text.toString().trim()
            //findViewById<ImageView>(R.id.iv).setImageBitmap(ILcdManager.getInstance(this).getTextBitmap(s))
            ILcdManager.getInstance(this).sendLCDDoubleString(findViewById<EditText>(R.id.etNumber).text.toString().trim(),findViewById<EditText>(R.id.etSize).text.toString().trim())
        }

        findViewById<TextView>(R.id.send11).setOnClickListener {
            ILcdManager.getInstance(this).setTextSize(StringUtils.getNumber(findViewById<EditText>(R.id.etSize).text.toString().trim()))
        }
        findViewById<TextView>(R.id.send6).setOnClickListener {
            isClick = 0
            val intent = Intent()
            intent.type = "image/*"
            intent.action = Intent.ACTION_GET_CONTENT
            startActivityForResult(intent, 1)

        }

        Thread {
            Looper.prepare()
            //  ILcdManager.getInstance(this).sendLCDCommand(4)
            if(bitmap == null) {
                bitmap = getTextBitmap("111", "222", "333", "444", "555", "666", "777")
            }
            Looper.loop()
        }.start()
        findViewById<TextView>(R.id.send7).setOnClickListener {
            //ILcdManager.getInstance(this).sendLCDBitmap(resources.openRawResource(R.drawable.red),resources.openRawResource(R.drawable.red))
//            isClick = 1
//            val intent = Intent()
//            intent.type = "image/*"
//            intent.action = Intent.ACTION_GET_CONTENT
//            startActivityForResult(intent, 1)

            ILcdManager.getInstance(this).sendLCDBitmap(bitmap)


//            val imageView = findViewById<ImageView>(R.id.iv)
//
//            // BitmapUtils.saveBmp(bitmap)
//            // bitmap = ILcdManager.toRGB565Bmp(bitmap)
//            /* 将Bitmap设定到ImageView */imageView.setImageBitmap(bitmap)
//            ILcdManager.getInstance(this).sendLCDBitmap(bitmap)
        }

    }

    var isClick=1
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)


        if (requestCode == 1){
            val uri: Uri? = data?.data
            val cr = this.contentResolver
            try {
                if (cr == null)return
                if (uri == null)return
                var bitmap = BitmapFactory.decodeStream(cr.openInputStream(uri!!))
                //设置图片显示，可以看到效果
                val imageView = findViewById<ImageView>(R.id.iv)

                // BitmapUtils.saveBmp(bitmap)
                // bitmap = ILcdManager.toRGB565Bmp(bitmap)
                /* 将Bitmap设定到ImageView */imageView.setImageBitmap(bitmap)
                //  var mat = Mat.zeros()
                if (isClick == 0){

                    ILcdManager.getInstance(this).sendLCDBitmap(bitmap)

                }else{
                    ILcdManager.getInstance(this).sendLCDBitmap(cr.openInputStream(uri!!),cr.openInputStream(uri!!))
                }

            } catch (e: FileNotFoundException) {
                Log.e("Exception",  e.toString())
            }

        }
    }

    private var newBitmap:Bitmap? = Bitmap.createBitmap(240, 320, Bitmap.Config.ARGB_8888)
    private lateinit var canvas:Canvas
    private val paint = Paint()
    private fun getTextBitmap(
        firstLine: String? = null,
        secondLine: String? = null,
        thirdLine: String? = null,
        fourthLine: String? = null,
        fifthLine: String? = null,
        sixthLine: String? = null,
        seventhLine: String? = null,
    ): Bitmap {
        canvas = Canvas(newBitmap!!)
        canvas.drawColor(Color.BLACK)
        paint.typeface = Typeface.create("Arial", Typeface.NORMAL)
        paint.textSize = 25f
        paint.color = Color.WHITE
        firstLine?.let {
            canvas.drawText(firstLine, 10.0f, 30.0f, paint)
        }
        secondLine?.let {
            canvas.drawText(secondLine, 10.0f, 70.0f, paint)
        }
        thirdLine?.let {
            canvas.drawText(thirdLine, 10.0f, 110.0f, paint)
        }
        fourthLine?.let {
            canvas.drawText(fourthLine, 10.0f, 150.0f, paint)
        }
        fifthLine?.let {
            canvas.drawText(fifthLine, 10.0f, 190.0f, paint)
        }
        sixthLine?.let {
            canvas.drawText(sixthLine, 10.0f, 230.0f, paint)
        }
        seventhLine?.let {
            canvas.drawText(seventhLine, 10.0f, 270.0f, paint)
        }
        return newBitmap!!
    }

}