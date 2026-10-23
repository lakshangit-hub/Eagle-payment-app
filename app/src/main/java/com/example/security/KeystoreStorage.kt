package com.example.security

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.ByteBuffer
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Android Keystore-backed AES-GCM secure storage.
 * Fails loudly on any encryption/decryption failure; never falls back to plaintext.
 */
class KeystoreStorage(private val context: Context) {

    private val keyAlias = "EagleCreditMasterKey"
    private val provider = "AndroidKeyStore"
    private val transformation = "AES/GCM/NoPadding"
    private val gcmTagLengthBits = 128
    private val ivLengthBytes = 12

    private val prefs: SharedPreferences =
        context.getSharedPreferences("eagle_credit_keystore_prefs", Context.MODE_PRIVATE)

    init {
        ensureKeyExists()
    }

    @Synchronized
    private fun ensureKeyExists() {
        val keyStore = KeyStore.getInstance(provider).apply { load(null) }
        if (!keyStore.containsAlias(keyAlias)) {
            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, provider)
            val spec = KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(true)
                .build()
            keyGenerator.init(spec)
            keyGenerator.generateKey()
        }
    }

    private fun getSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(provider).apply { load(null) }
        val entry = keyStore.getEntry(keyAlias, null) as? KeyStore.SecretKeyEntry
            ?: throw SecurityException("Keystore key not found for alias: $keyAlias")
        return entry.secretKey
    }

    /**
     * Encrypts plaintext bytes using AES/GCM/NoPadding.
     * Returns Base64-encoded [IV + Ciphertext].
     */
    fun encrypt(plaintext: String): String {
        try {
            val secretKey = getSecretKey()
            val cipher = Cipher.getInstance(transformation)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            val iv = cipher.iv ?: throw SecurityException("Cipher failed to generate IV")
            val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))

            val byteBuffer = ByteBuffer.allocate(iv.size + ciphertext.size)
            byteBuffer.put(iv)
            byteBuffer.put(ciphertext)

            return Base64.encodeToString(byteBuffer.array(), Base64.NO_WRAP)
        } catch (e: Exception) {
            throw SecurityException("Hardware Keystore encryption failure: ${e.message}", e)
        }
    }

    /**
     * Decrypts Base64-encoded [IV + Ciphertext] using AES/GCM/NoPadding.
     */
    fun decrypt(encryptedBase64: String): String {
        try {
            val combined = Base64.decode(encryptedBase64, Base64.NO_WRAP)
            if (combined.size < ivLengthBytes) {
                throw SecurityException("Corrupted payload: size is smaller than IV length")
            }

            val iv = ByteArray(ivLengthBytes)
            val ciphertext = ByteArray(combined.size - ivLengthBytes)

            System.arraycopy(combined, 0, iv, 0, ivLengthBytes)
            System.arraycopy(combined, ivLengthBytes, ciphertext, 0, ciphertext.size)

            val secretKey = getSecretKey()
            val cipher = Cipher.getInstance(transformation)
            val spec = GCMParameterSpec(gcmTagLengthBits, iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

            val plaintext = cipher.doFinal(ciphertext)
            return String(plaintext, Charsets.UTF_8)
        } catch (e: Exception) {
            throw SecurityException("Hardware Keystore decryption failure: ${e.message}", e)
        }
    }

    fun setSecureItem(key: String, value: String): Boolean {
        val encrypted = encrypt(value)
        prefs.edit().putString(key, encrypted).apply()
        return true
    }

    fun getSecureItem(key: String): String? {
        val encrypted = prefs.getString(key, null) ?: return null
        return decrypt(encrypted)
    }

    fun removeSecureItem(key: String): Boolean {
        prefs.edit().remove(key).apply()
        return true
    }
}
